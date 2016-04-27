$(function() {

    var SearchBarModel = Backbone.Model.extend({
        defaults: {
            query : ''
        }
    });

    var SearchResult = Backbone.Model.extend({
        defaults:{
            id:'',
            name:'',
            brandName:'',
            calories: 0,
            serving:''
        }
    });

    var SearchResultList = Backbone.Collection.extend({
        model:SearchResult
    });

    var LoggedList =  Backbone.Collection.extend({
        model:SearchResult
    });

    var LoggedListView = Backbone.View.extend({
        el:$('#log-list'),
    });

    var resultTemplate;
    var SearchResultListView = Backbone.View.extend({
        el:$('#search-list'),
        events: {
            'click button':'addItem'
        },
        template: _.template($('#result-tmpl').html()),
      /*  events:{
            'keyup #search-box':'getNutritionixData'
        },*/
        initialize:function(options){
            var self = this;

            /*self.$el.html('');*/
            self.listenTo(searchResults,'change',self.render);

        },

        render:function(){
            var self=this;
            $(self.el).html('');
            var resultCollection = this.collection;
            resultCollection.each(function(result){
                $(self.el).append(self.template(result.toJSON()));
            });
            return this;
        },

        addItem:function(e){
            e.preventDefault();
            console.log(e);
            var id = $(e.currentTarget).data("id");
            var item = this.collection.get(id);
            console.log(item);
            console.log("added");
        }



    })

    var searchResults = new SearchResultList();

    var searchQuery = new SearchBarModel();
    var resultList = new SearchResultListView({collection:searchResults});
    var SearchBarView = Backbone.View.extend({

        el:$('#search-box'),
        events: {
            'keyup':'performSearch'
        },
        initialize:function(){
            var self=this;
        },

        /*render:function(){
            console.log("hello");
        },*/

        performSearch:function(){
            this.model.set('query',this.$el.val());
            if(this.model.get('query') != ''){
            this.getNutritionixData(this.model.get('query'));
        }

        else{
            $(resultList.el).html('');
        }
        },
         getNutritionixData:function(query){
            var nutritionixUrl = "https://api.nutritionix.com/v1_1/search/" + query + "?results=0%3A10&cal_min=0&cal_max=2000&fields=nf_calories%2Cbrand_name%2Citem_name&appId=4a056a89&appKey=5aaa96859042a59ad264d3a51ff34bba";
              $.ajax({
                    dataType: "json",
                    url: nutritionixUrl,
                    success: function(data){
                        searchResults.reset();
                        var count = 0
                        data.hits.forEach(function(hit){

                            searchResults.add(new SearchResult({id: count, name:hit.fields.item_name, brandName:hit.fields.brand_name, calories: hit.fields.nf_calories, serving: hit.fields.nf_serving_size_qty + " " + hit.fields.nf_serving_size_unit}));
                            count++
                        });

                        resultList.render();

                    }

                });
        }

    });


    var searchBar = new SearchBarView({model: searchQuery});
});
