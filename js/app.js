$(function() {

    var CalorieGoalModel = Backbone.Model.extend({
        defaults: {
            goal: 0
        }
    });

    var CalorieGoals = Backbone.Collection.extend({
        model: CalorieGoalModel
    });

    var chart;
    var CalorieGoalView = Backbone.View.extend({
        el: 'body',
        events: {
            'click #goal-save': 'setGoal'
        },
        initialize: function() {
            this.listenTo(this.model, 'change', this.render);
            chart = new CanvasJS.Chart("chart-container", {
                title: {
                    text: "Calories"
                },
                animationEnabled: true,
                data: [{
                    type: "doughnut",
                    startAngle: 20,
                    toolTipContent: "{label}: {y}",
                    indexLabel: "{label}",
                    dataPoints: [

                        { y: 2000, label: "Calories left" },
                        { y: 0 }

                    ]
                }]
            });

        },
        render: function() {
            var self = this;
            self.$('#goal-status').css('visibility', 'visible');
            self.$('#goal-status').html('You have consumed ' + logList.calorieCount + ' calories out of ' + self.model.get('goal') + ' calories');


            chart.options.data[0].dataPoints[0].y = self.model.get('goal') - logList.calorieCount;
            chart.render();
        },
        setGoal: function() {
            var self = this;
            var goal = self.$('input').val();
            self.model.set('goal', goal);
        }
    });


    var SearchBarModel = Backbone.Model.extend({
        defaults: {
            query: ''
        }
    });


    var SearchResult = Backbone.Model.extend({
        defaults: {
            name: '',
            brandName: '',
            totalCalories: 0,
            baseCalories: 0,
            servingSize: 0,
            servingUnit: '',
            logTime: 0
        },
        toJSON: function() {
            var json = Backbone.Model.prototype.toJSON.apply(this, arguments);
            json.cid = this.cid;
            return json;
        }
    });

    var SearchResultList = Backbone.Collection.extend({
        model: SearchResult
    });

    var LoggedItem = Backbone.Model.extend({
        defaults: {
            name: '',
            brandName: '',
            totalCalories: 0,
            baseCalories: 0,
            servingSize: 0,
            servingUnit: '',
            logTime: 0
        },
        toJSON: function() {
            var json = Backbone.Model.prototype.toJSON.apply(this, arguments);
            json.cid = this.cid;
            return json;
        }
    });

    var LoggedList = Backbone.Collection.extend({
        model: LoggedItem,
        calorieCount: 0
    });

    var LoggedListView = Backbone.View.extend({
        el: $('#log-list'),
        events: {
            'click #remove-icon': 'removeLogItem'
        },
        template: _.template($('#log-tmpl').html()),
        initialize: function() {
            var self = this;
            self.listenTo(self.collection, 'add', self.render);
            self.listenTo(self.collection, 'remove', self.render);
        },

        render: function() {
            var self = this;
            $(self.el).find('td').empty();


            this.collection.each(function(log) {
                $(self.el).append(self.template(log.toJSON()));
            });
            return this;
        },

        removeLogItem: function(e) {
            e.preventDefault();
            var element = $(e.currentTarget).parents()[1];
            var id = $(e.currentTarget).data("id");
            var item = this.collection.get(id);
            this.collection.remove(item);
        }
    });

    var totalsView = Backbone.View.extend({
        el: $('#total-calories'),
        initialize: function() {
            var self = this;
            self.listenTo(self.collection, 'add', self.addUpCalories);
            self.listenTo(self.collection, 'remove', self.addUpCalories);
        },

        addUpCalories: function() {
            var self = this;
            self.collection.calorieCount = 0;
            self.collection.each(function(log) {
                self.collection.calorieCount += log.get('totalCalories');
            });
            self.$('span').html(self.collection.calorieCount);
            chart.options.data[0].dataPoints[1] = { y: logList.calorieCount, label: "Calories Consumed" };
            calorieGoal.render();
        }
    });

    var resultTemplate;
    var SearchResultListView = Backbone.View.extend({
        el: $('#search-list'),
        events: {
            'click button': 'addItem',
            'mousedown #edit-icon': 'edit',
            'keyup .serving-size': 'updateCalories'
        },
        template: _.template($('#result-tmpl').html()),
        initialize: function(options) {
            var self = this;
            self.listenTo(searchResults, 'change', self.render);

        },

        edit: function(e) {
            e.preventDefault();
            var element = $(e.currentTarget).siblings();
            element.attr('contentEditable', true);
            element.focus();
        },
        updateCalories: function(e) {
            e.preventDefault();
            var id = $(e.currentTarget).data("id");
            var item = this.collection.get(id);
            item.set('servingSize', $(e.currentTarget).html());
            item.set('totalCalories', ($(e.currentTarget).html() * item.get('baseCalories')));
        },
        render: function() {
            var self = this;
            $(self.el).html('');
            var resultCollection = this.collection;
            resultCollection.each(function(result) {
                $(self.el).append(self.template(result.toJSON()));
            });
            return this;
        },

        addItem: function(e) {
            e.preventDefault();
            var id = $(e.currentTarget).data("id");
            var item = this.collection.get(id);
            var loggedItem = new LoggedItem({ name: item.get('name'), brandName: item.get('brandName'), baseCalories: item.get('baseCalories'), totalCalories: item.get('totalCalories'), servingSize: item.get('servingSize'), servingUnit: item.get('servingUnit'), logTime: Date.now() });
            logList.add(loggedItem);
        }



    })

    var goal = new CalorieGoalModel();
    var calorieGoal = new CalorieGoalView({ model: goal });
    var searchResults = new SearchResultList();
    var logList = new LoggedList();
    var logView = new LoggedListView({ collection: logList });
    var totalCalories = new totalsView({ collection: logList });
    var searchQuery = new SearchBarModel();
    var resultList = new SearchResultListView({ collection: searchResults });
    var SearchBarView = Backbone.View.extend({

        el: $('#search-box'),
        events: {
            'keyup': 'performSearch'
        },
        initialize: function() {
            var self = this;
        },

        performSearch: function() {
            this.model.set('query', this.$el.val());
            if (this.model.get('query') != '') {
                this.getNutritionixData(this.model.get('query'));
            } else {
                $(resultList.el).html('');
            }
        },
        getNutritionixData: function(query) {
            var nutritionixUrl = "https://api.nutritionix.com/v1_1/search/" + query + "?results=0%3A10&cal_min=0&cal_max=2000&fields=nf_calories%2Cbrand_name%2Citem_name&appId=4a056a89&appKey=5aaa96859042a59ad264d3a51ff34bba";
            $.ajax({
                dataType: "json",
                url: nutritionixUrl,
                success: function(data) {
                    searchResults.reset();
                    var count = 0
                    data.hits.forEach(function(hit) {

                        searchResults.add(new SearchResult({ name: hit.fields.item_name, brandName: hit.fields.brand_name, baseCalories: hit.fields.nf_calories, totalCalories: hit.fields.nf_calories, servingSize: hit.fields.nf_serving_size_qty, servingUnit: hit.fields.nf_serving_size_unit }));
                        count++
                    });

                    resultList.render();

                }

            });
        }

    });


    var searchBar = new SearchBarView({ model: searchQuery });
});
